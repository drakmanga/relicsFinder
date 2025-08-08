package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
@NoArgsConstructor
public class Relic {
    private String tier;
    private String relicName;
    private String state;
    private List<Rewards> rewards;

    public Relic(String tier, String name, String state, List<Rewards> rewards) {
        this.tier = tier;
        this.relicName = name;
        this.state = state;
        this.rewards = rewards;
    }

    public Relic(String tier, String name) {
        this.tier = tier;
        this.relicName = name;
    }

    public Relic( String name) {
        this.relicName = name;
    }
}
