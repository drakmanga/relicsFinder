package relics.reliceApi.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RelicVaultedService {

    private String getPageHtml() throws IOException {
        // Per esempio prendi la pagina web da cui estrarre la tabella
        return Jsoup.connect("https://warframe.fandom.com/wiki/Void_Relic#List_of_Void_Relics_and_Drop_Sites").get().html();
    }

    public List<String> extractUnvaultedRelics() throws IOException {
        String html = getPageHtml();
        Set<String> relics = new HashSet<>();

        Document doc = Jsoup.parse(html);

        Element table = doc.selectFirst("table.article-table:has(caption:contains(Unvaulted/Available Relics))");
        if (table == null) {
            System.out.println("Tabella non trovata");
            return Collections.emptyList();
        }

        Elements rows = table.select("tbody > tr");
        if (rows.size() < 2) {
            System.out.println("Righe insufficienti nella tabella");
            return Collections.emptyList();
        }

        Element relicsRow = rows.get(1);

        Elements columns = relicsRow.select("td");

        for (Element cell : columns) {
            Elements listItems = cell.select("ul > li");

            for (Element li : listItems) {
                Element a = li.selectFirst("a");
                if (a != null) {
                    relics.add(a.text().trim());
                }
            }
        }

        Map<String, Integer> orderMap = Map.of(
                "Lith", 1,
                "Meso", 2,
                "Neo", 3,
                "Axi", 4,
                "Requiem", 5
        );

        List<String> sortedList = new ArrayList<>(relics);
        sortedList.sort((r1, r2) -> {
            String prefix1 = r1.split(" ")[0];
            String prefix2 = r2.split(" ")[0];

            int order1 = orderMap.getOrDefault(prefix1, 999);
            int order2 = orderMap.getOrDefault(prefix2, 999);

            if (order1 != order2) {
                return Integer.compare(order1, order2);
            } else {
                return r1.compareToIgnoreCase(r2);
            }
        });

        return sortedList;
    }

    public boolean isVaulted(String relicName) throws IOException {
        List<String> unvaultedRelics = extractUnvaultedRelics();
        String fullRelicName = (relicName.replace("_", " ").trim().toLowerCase());

        Set<String> unvaultedLower = unvaultedRelics.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toSet());

        boolean isUnvaulted = unvaultedLower.contains(fullRelicName);
        return !isUnvaulted;
    }

}




